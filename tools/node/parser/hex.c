
#include <stdio.h>
#include <ctype.h>

int
main (int argc, char **argv)
{
	int	cc = 0;
	
	do
	{
		cc = getchar ();
		
		if (cc >= 0)
		{
			int	print = isalnum (cc) || cc == ' ' || cc == '.' || cc == '-' || cc == '_' || cc == ':' || cc == ';';

			printf ("%03d %02x %c\n", cc, cc, print ? cc : '?');
		}
	}
	while (cc >= 0);
	
}
